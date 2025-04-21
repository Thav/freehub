class CreateUserOrganizationRoles < ActiveRecord::Migration[7.0]
  def change
    create_table :user_organization_roles do |t|
      t.references :user, null: false, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      t.string :role, null: false, default: 'member'

      # A user can only have one role per org
      t.index %i[user_id organization_id], unique: true

      t.timestamps null: false
    end
  end
end
