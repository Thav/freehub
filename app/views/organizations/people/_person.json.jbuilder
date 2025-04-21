json.extract! person, :id, :full_name, :country, :address, :email, :email_opt_out, :phone, :organization_id, :created_at, :updated_at
json.url organization_person_url(@org, person, format: :json)
