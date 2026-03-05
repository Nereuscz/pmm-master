-- Anotace projektu: generované 1x, editovatelné, přegenerovatelné na tlačítko
alter table project_context
  add column if not exists annotations text,
  add column if not exists annotations_updated timestamptz;
