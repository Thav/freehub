json.extract! service, :id, :start_date, :end_date, :paid, :volunteered, :service_type, :note_id, :person_id, :created_at, :updated_at
json.url organization_service_url(@org, service, format: :json)
