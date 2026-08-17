class Tag < ApplicationRecord
  belongs_to :organization
  has_many :person_tags, dependent: :destroy
end
