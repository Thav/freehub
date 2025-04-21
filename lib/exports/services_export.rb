require 'exports/export'

module Exports
  class ServicesExport < Exports::Export
    self.model_class = Service

    add_column :first_name, :string, ->(service) { service.person.first_name }
    add_column :last_name, :string, ->(service) { service.person.last_name }
    add_column :email, :string, ->(service) { service.person.email }
    add_column :email_opt_out, :boolean, ->(service) { service.person.email_opt_out }
    add_column :phone, :string, ->(service) { service.person.phone }
    add_column :postal_code, :string, ->(service) { service.person.zip }

    add_column :service_type_id, :string, :service_type
    add_column :start_date, :datetime
    add_column :end_date, :datetime
    add_column :volunteered, :boolean
    add_column :paid, :boolean
    add_column :note, :string, ->(service) { service.note&.body }
  end
end
