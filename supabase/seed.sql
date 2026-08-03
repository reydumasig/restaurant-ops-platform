-- Reference data for local development. Not customer data.

insert into roles (key, name, description) values
  ('owner', 'Owner', 'Full access across all branches and commissary; sees all reports and dashboards.'),
  ('admin', 'Admin', 'Full operational access across all branches and commissary, excluding org-level settings reserved for Owner.'),
  ('commissary_staff', 'Commissary Staff', 'Manages commissary inventory, production, and outbound transfers.'),
  ('branch_manager', 'Branch Manager', 'Full access within their assigned branch: inventory, transfers, sales.'),
  ('branch_staff', 'Branch Staff', 'Limited access within their assigned branch: stock receiving, basic inventory views.')
on conflict (key) do nothing;

insert into units_of_measure (name, abbreviation) values
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Liter', 'L'),
  ('Milliliter', 'mL'),
  ('Piece', 'pc'),
  ('Pack', 'pack'),
  ('Box', 'box')
on conflict (abbreviation) do nothing;
