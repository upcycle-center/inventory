-- Flip "Target pour cost %" (cost as a % of MSRP) to "Target Profit %"
-- (profit as a % of MSRP) -- MSRP = cost / (1 - profit% / 100) instead of
-- cost / (pour-cost% / 100). Existing values are converted (100 - old)
-- so each recipe's MSRP stays the same after the flip; new rows default
-- to 80% profit (equivalent to the old 20% pour-cost default).
alter table recipes rename column target_pour_cost_pct to target_profit_pct;
update recipes set target_profit_pct = 100 - target_profit_pct;
alter table recipes alter column target_profit_pct set default 80;
