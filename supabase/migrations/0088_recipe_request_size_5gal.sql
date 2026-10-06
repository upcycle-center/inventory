-- Add a 5gal Bubbler batch size, alongside the existing 2.5gal Bubbler.
alter type recipe_request_size add value if not exists 'batch_5_gal';
