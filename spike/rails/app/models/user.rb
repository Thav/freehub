class User < ApplicationRecord
  has_secure_password
  has_many :memberships, dependent: :destroy
  has_many :organizations, through: :memberships
end
