class PersonTag < ApplicationRecord
  belongs_to :organization
  belongs_to :person
  belongs_to :tag
end
