class PersonArchiveEvent < ApplicationRecord
  belongs_to :organization
  belongs_to :person
  belongs_to :actor_user, class_name: "User"
end
