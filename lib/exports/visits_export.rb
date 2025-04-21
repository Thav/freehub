require 'exports/export'

module Exports
  class VisitsExport < Exports::Export
    self.model_class = Visit

    add_column :first_name, :string, ->(visit) { visit.person.first_name }
    add_column :last_name, :string, ->(visit) { visit.person.last_name }
    add_column :email, :string, ->(visit) { visit.person.email }
    add_column :email_opt_out, :boolean, ->(visit) { visit.person.email_opt_out }
    add_column :phone, :string, ->(visit) { visit.person.phone }
    add_column :postal_code, :string, ->(visit) { visit.person.zip }

    add_column :arrived_at, :datetime
    add_column :start_at, :datetime
    add_column :end_at, :datetime
    add_column :staff, :boolean, ->(visit) { visit.person.staff }
    add_column :member, :boolean, :member?
    add_column :volunteer, :boolean
    add_column :note, :string, ->(visit) { visit.note&.body }
  end
end
