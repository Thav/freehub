class UserOrganizationRole < ApplicationRecord
  enum role: { manager: 'manager', member: 'member' }
  belongs_to :user
  belongs_to :organization
end
