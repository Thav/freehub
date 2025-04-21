class CreateVisits < ActiveRecord::Migration[7.0]
  def change
    create_table :visits do |t|
      t.boolean :volunteer, null: false, default: false
      t.datetime :arrived_at
      t.datetime :start_at
      t.datetime :end_at
      t.references :organization, null: false, foreign_key: true
      t.references :note, foreign_key: true, null: true
      t.references :person, null: false, foreign_key: true
      t.references :created_by_user, null: false, foreign_key: { to_table: :users }
      t.references :updated_by_user, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
