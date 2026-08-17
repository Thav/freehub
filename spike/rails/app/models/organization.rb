class Organization < ApplicationRecord
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :people, dependent: :destroy
  has_many :visits, dependent: :destroy
end
