class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :trackable

  has_many :roles, class_name: 'UserOrganizationRole', dependent: :destroy
  has_many :organizations, through: :roles

  def full_name
    "#{first_name} #{last_name}"
  end
end
