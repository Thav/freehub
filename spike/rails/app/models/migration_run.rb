class MigrationRun < ApplicationRecord
  has_many :migration_issues, dependent: :destroy
  has_many :legacy_identities, dependent: :destroy
end
