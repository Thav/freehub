class MigrationIssue < ApplicationRecord
  belongs_to :migration_run
  belongs_to :resolved_by_user, class_name: "User", optional: true
end
