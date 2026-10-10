# Global arrow spacing

User approved this appearance-only change on October 10, 2026. Site-wide design rule: balance clearance between the label and arrow and between the arrow and the control edge. Single-select dropdowns use a 12px chevron, a 12px label gap and 12px edge clearance. Existing native keyboard/selection behavior is retained; multi-selects retain native styling, and forced-color mode restores the native arrow.

Shared implementation: `shared/control-spacing.css` and `.js`, loaded by all 32 root site pages. Trailing/leading text arrows in buttons and links are wrapped decoratively without replacing their controls or handlers. Arrow-to-label gap matches existing inline edge padding (12px fallback for unpadded links). Dynamic controls receive the same treatment. Other pending changes preserved. No database/account/service changes, commit, push or Phase 2 scheduling activation.

Visual check: digest Monthly dropdown and Open inbox arrow have balanced clearance; shared rule also checked on Use History selectors. Screenshot in active chat `outputs/control-spacing/digest.jpg`. Module syntax and diff whitespace checks pass. Maintain this convention for future controls.
