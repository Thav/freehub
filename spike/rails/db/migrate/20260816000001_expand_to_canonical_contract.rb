# The spike deliberately materializes the FH-005 contract even though its web
# workflow uses only the login/person/visit/export slice.  Later tickets own the
# product features for the additional tables.
class ExpandToCanonicalContract < ActiveRecord::Migration[8.1]
  def change
    add_column :organizations, :location, :string, limit: 255
    add_index :users, "lower(email)", unique: true, name: "users_email_lower_unique"

    change_table :people do |t|
      t.boolean :email_opt_out, null: false, default: false
      t.string :street1, limit: 255
      t.string :street2, limit: 255
      t.string :city, limit: 120
      t.string :state, limit: 120
      t.string :postal_code, limit: 40
      t.string :country, limit: 2
      t.integer :year_of_birth, limit: 2
      t.bigint :archived_by_user_id
      t.bigint :created_by_user_id
      t.bigint :updated_by_user_id
    end
    add_index :people, %i[organization_id normalized_email]
    add_index :people, %i[organization_id normalized_phone]

    change_table :visits do |t|
      t.bigint :created_by_user_id
      t.bigint :updated_by_user_id
    end
    add_index :visits, %i[organization_id arrived_at]
    change_table :services do |t|
      t.boolean :paid, null: false, default: false
      t.boolean :volunteered, null: false, default: false
      t.bigint :created_by_user_id
      t.bigint :updated_by_user_id
    end

    create_table :tags do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false, limit: 120
      t.timestamps
    end
    add_index :tags, %i[organization_id name], unique: true

    create_table :person_tags do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :person, null: false, foreign_key: true
      t.references :tag, null: false, foreign_key: true
      t.datetime :created_at, null: false
    end
    add_index :person_tags, %i[person_id tag_id], unique: true

    create_table :notes do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :person, foreign_key: true
      t.references :visit, foreign_key: true
      t.references :service, foreign_key: true
      t.text :text, null: false
      t.bigint :created_by_user_id
      t.bigint :updated_by_user_id
      t.timestamps
    end
    add_check_constraint :notes, "((person_id IS NOT NULL)::integer + (visit_id IS NOT NULL)::integer + (service_id IS NOT NULL)::integer) = 1", name: "notes_one_target"

    create_table :person_archive_events do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :person, null: false, foreign_key: true
      t.bigint :actor_user_id, null: false
      t.string :action, null: false, limit: 12
      t.datetime :occurred_at, null: false
      t.text :reason
    end

    create_table :import_jobs do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :format, null: false, limit: 16
      t.string :source_sha256, null: false, limit: 64
      t.string :status, null: false, limit: 16
      t.bigint :created_by_user_id, null: false
      t.datetime :created_at, null: false
      t.datetime :applied_at
    end
    add_index :import_jobs, %i[organization_id source_sha256], unique: true

    create_table :import_rows do |t|
      t.references :import_job, null: false, foreign_key: true
      t.integer :row_number, null: false
      t.string :disposition, null: false, limit: 16
      t.bigint :matched_person_id
      t.bigint :created_person_id
      t.string :match_reason, limit: 80
      t.jsonb :warnings, null: false, default: []
      t.jsonb :errors, null: false, default: []
      t.string :input_fingerprint, null: false, limit: 64
    end
    add_index :import_rows, %i[import_job_id row_number], unique: true

    create_table :migration_runs do |t|
      t.string :source_sha256, null: false, limit: 64
      t.integer :contract_version, null: false
      t.datetime :started_at, null: false
      t.datetime :completed_at
      t.string :report_sha256, limit: 64
    end
    create_table :migration_issues do |t|
      t.references :migration_run, null: false, foreign_key: true
      t.string :source_table, null: false, limit: 80
      t.bigint :source_id
      t.string :category, null: false, limit: 120
      t.string :disposition, null: false, default: "open", limit: 16
      t.string :payload_fingerprint, null: false, limit: 64
      t.jsonb :sanitized_detail, null: false, default: {}
      t.bigint :resolved_by_user_id
      t.datetime :resolved_at
    end
    add_index :migration_issues, %i[migration_run_id source_table source_id category], unique: true, name: "migration_issues_source_unique"
    create_table :legacy_identities do |t|
      t.references :migration_run, null: false, foreign_key: true
      t.string :source_table, null: false, limit: 80
      t.bigint :source_id, null: false
      t.string :target_entity, null: false, limit: 80
      t.bigint :target_id, null: false
    end
    add_index :legacy_identities, %i[migration_run_id source_table source_id target_entity target_id], unique: true, name: "legacy_identities_source_unique"
  end
end
