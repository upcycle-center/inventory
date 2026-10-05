-- Flip "Target Profit %" (profit as a % of MSRP, capped under 100%) to
-- "Target Markup %" (profit as a % of cost, no upper bound) -- MSRP =
-- cost * (1 + markup% / 100) instead of cost / (1 - profit% / 100).
-- Existing values are converted (markup% = (1 / (1 - profit%/100) - 1) * 100)
-- so each recipe's MSRP stays the same after the flip; new rows default
-- to 400% markup (the same 5x multiple as the old 80% profit default).
alter table recipes rename column target_profit_pct to target_markup_pct;
update recipes set target_markup_pct = round((1 / (1 - target_markup_pct / 100.0) - 1) * 100, 2);
alter table recipes alter column target_markup_pct set default 400;
