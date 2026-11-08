# Deterministic Recommendation Scoring Specification (`docs/ai/SCORING.md`)

This document defines the mathematical formulation and operational rules for deterministic candidate recommendation scoring within CarbonQuest.

---

## 1. Principles

1. **Zero Black-Box Scoring**: Every score is deterministically reproducible from the user's preference profile, activity hotspots, and T2 saving estimates.
2. **Deterministic Tie-Breaking**: Candidates with identical scores are sorted alphabetically ascending by `action_key`.
3. **Transparent Breakdown**: Every score returned to the user or API client includes its 5 component breakdown: `impact`, `preference`, `feasibility`, `goal_fit`, and `cooldown_penalty`.

---

## 2. Mathematical Formulation

The composite recommendation score $S(a) \in [0.05, 0.99]$ for candidate action $a$ is computed as:

$$S(a) = \text{clamp}\left( w_{\text{impact}} S_{\text{impact}} + w_{\text{pref}} S_{\text{pref}} + w_{\text{feas}} S_{\text{feas}} + w_{\text{goal}} S_{\text{goal}} - P_{\text{cooldown}}, 0.05, 0.99 \right)$$

Rounded to 2 decimal places.

### Component 1: Normalized Impact ($S_{\text{impact}} \in [0.10, 1.00]$)
Measures the deterministic projected monthly emission reduction relative to a 25.0 kg CO2e/month benchmark:

$$S_{\text{impact}} = \min\left(1.0, \max\left(0.10, \frac{\text{saving\_kg\_month}}{25.0}\right)\right)$$

Where `saving_kg_month` is computed exclusively by `app.services.carbon.impact.estimate_saving()`.

### Component 2: Preference Affinity ($S_{\text{pref}} \in [0.10, 1.00]$)
Derived from the conjugate Beta-Bernoulli expected acceptance probability $E[\theta]$ modulated by category affinity weight $W_{\text{cat}}$:

$$E[\theta_a] = \frac{\alpha_a}{\alpha_a + \beta_a}$$

$$S_{\text{pref}} = \min\left(1.0, \max\left(0.10, E[\theta_a] \times \frac{W_{\text{cat}}}{1.0}\right)\right)$$

- $\alpha_a, \beta_a$ start at default prior (1.0, 1.0) with $E[\theta] = 0.50$.
- $W_{\text{cat}}$ starts at 1.0, updated dynamically via user feedback.

### Component 3: Feasibility ($S_{\text{feas}} \in [0.40, 0.90]$)
Derived from catalog difficulty $D \in \{1, 2, 3, 4, 5\}$ and user's `difficulty_tolerance` $T_{\text{diff}}$:

- Base feasibility by difficulty:
  - $D = 1$: 0.90
  - $D = 2$: 0.80
  - $D = 3$: 0.70
  - $D = 4$: 0.50
  - $D = 5$: 0.40
- If $D > 2$ and $T_{\text{diff}} < 0.55$, apply difficulty dampener:
  $$S_{\text{feas}} = \max\left(0.20, S_{\text{feas}} - (0.55 - T_{\text{diff}})\right)$$

### Component 4: Goal & Hotspot Fit ($S_{\text{goal}} \in [0.50, 1.00]$)
Ranks alignment with the user's top emission hotspots (retrieved from `get_hotspots()`):
- Candidate category in Top 1 hotspot: $S_{\text{goal}} = 1.00$
- Candidate category in Top 2 hotspot: $S_{\text{goal}} = 0.85$
- Candidate category in Top 3 hotspot: $S_{\text{goal}} = 0.70$
- Other categories: $S_{\text{goal}} = 0.50$

### Component 5: Cooldown Penalty ($P_{\text{cooldown}} \ge 0$)
Applied when an action was previously skipped or rejected in recent cycles:
- Rejected in current cycle or preceding cycle ($\Delta_{\text{cycles}} \le 1$): $P_{\text{cooldown}} = 0.35$
- Skipped in current cycle or preceding cycle ($\Delta_{\text{cycles}} \le 1$): $P_{\text{cooldown}} = 0.20$
- Skipped/rejected 2 cycles prior ($\Delta_{\text{cycles}} = 2$): $P_{\text{cooldown}} = 0.10$
- Otherwise: $P_{\text{cooldown}} = 0.00$

---

## 3. Standard Weights

| Weight Parameter | Value | Description |
|---|---|---|
| $w_{\text{impact}}$ | 0.35 | Carbon reduction effectiveness |
| $w_{\text{pref}}$ | 0.30 | Historical user acceptance & category preference |
| $w_{\text{feas}}$ | 0.20 | Implementation ease and friction level |
| $w_{\text{goal}}$ | 0.15 | Alignment with user's top emission hotspots |
| **Sum** | **1.00** | Strict normalization |

---

## 4. Tie-Breaking Strategy

Sorting tuple:
```python
(-score, candidate.action_key)
```
Where score is descending, and `action_key` is ascending alphabetical string sort. Ties are guaranteed 100% deterministic across all runs and platforms.
