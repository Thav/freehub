class CreateNotes < ActiveRecord::Migration[7.0]
  def change
    create_table :notes do |t|
      t.text :body
      t.references :created_by_user, null: false, foreign_key: { to_table: :users }
      t.references :updated_by_user, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
