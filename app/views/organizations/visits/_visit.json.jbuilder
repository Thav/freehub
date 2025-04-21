json.extract! visit, :id, :note_id, :volunteer, :arrived_at, :start_at, :end_at, :created_at, :updated_at
json.url organization_visit_url(@org, visit, format: :json)
