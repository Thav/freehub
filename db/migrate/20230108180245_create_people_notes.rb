class CreatePeopleNotes < ActiveRecord::Migration[7.0]
  def change
    create_table :people_notes do |t|
      t.references :person, null: false, foreign_key: true
      t.references :note, null: false, foreign_key: true
    end
  end
end
