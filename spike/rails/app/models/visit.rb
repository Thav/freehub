class Visit < ApplicationRecord
  belongs_to :organization
  belongs_to :person
  has_many :notes, dependent: :destroy
  attr_readonly :staff_snapshot, :member_snapshot
end
