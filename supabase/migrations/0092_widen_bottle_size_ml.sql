-- bottle_size_ml was numeric(6,2) -- max 9999.99 -- which overflows for
-- a large water container entered in fl oz (e.g. a 5-gallon jug, 640 fl
-- oz, converts to ~18,927 mL). Widen to match pour_price's numeric(10,2).
alter table products alter column bottle_size_ml type numeric(10, 2);
