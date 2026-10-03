-- "Save for later" support for Recipe Request, same drafting mechanism
-- already used by Request/Transfer/Return -- lets someone line up every
-- recipe needed for an event before posting the whole batch at once.
alter type action_draft_type add value if not exists 'recipe_request';
