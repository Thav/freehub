require 'exports/export'

module Exports
  class PeopleExport < Exports::Export
    self.model_class = Person

    add_column :first_name, :string
    add_column :last_name, :string
    add_column :staff, :boolean
    add_column :email, :string
    add_column :email_opt_out, :boolean
    add_column :phone, :string
    add_column :postal_code, :string, :zip
    add_column :street1, :string
    add_column :street2, :string
    add_column :city, :string
    add_column :state, :string
    add_column :country, :string
    add_column :yob, :string, :birth_year
    add_column :created_at, :datetime
    add_column :memebership_expires_at, :datetime, ->(person) { person.services.maximum(:end_date) }
  end
end
