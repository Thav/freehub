class Service < ApplicationRecord
  self.inheritance_column = nil
  belongs_to :organization
  belongs_to :person
  has_many :notes, dependent: :destroy
end
