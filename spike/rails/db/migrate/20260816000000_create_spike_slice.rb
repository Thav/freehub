class CreateSpikeSlice < ActiveRecord::Migration[8.1]
  def change
    create_table :organizations do |t|; t.string :name, null: false; t.string :key, null: false; t.string :timezone, null: false; t.timestamps; end
    add_index :organizations, "lower(key)", unique: true, name: "organizations_key_lower_unique"
    create_table :users do |t|; t.string :login, null: false; t.string :email, null: false; t.string :name, null: false; t.string :password_digest, null: false; t.boolean :password_change_required, null: false, default: true; t.boolean :platform_administrator, null: false, default: false; t.timestamps; end
    add_index :users, "lower(login)", unique: true, name: "users_login_lower_unique"
    create_table :memberships do |t|; t.references :organization, null: false, foreign_key: true; t.references :user, null: false, foreign_key: true; t.string :role, null: false; t.timestamps; end
    add_index :memberships, %i[organization_id user_id], unique: true
    create_table :people do |t|; t.references :organization, null: false, foreign_key: true; t.string :first_name, null: false; t.string :last_name; t.string :display_name, null: false; t.string :email; t.string :normalized_email; t.string :phone; t.string :normalized_phone; t.boolean :staff, null: false, default: false; t.datetime :archived_at; t.timestamps; end
    add_index :people, %i[organization_id display_name]
    create_table :services do |t|; t.references :organization, null: false, foreign_key: true; t.references :person, null: false, foreign_key: true; t.string :type, null: false; t.date :start_date; t.date :end_date; t.timestamps; end
    create_table :visits do |t|; t.references :organization, null: false, foreign_key: true; t.references :person, null: false, foreign_key: true; t.string :activity, null: false; t.datetime :arrived_at; t.datetime :started_at; t.datetime :ended_at; t.integer :duration_seconds; t.boolean :staff_snapshot, null: false; t.boolean :member_snapshot, null: false; t.timestamps; end
  end
end
