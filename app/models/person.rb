class Person < ApplicationRecord
  belongs_to :organization
  belongs_to :created_by, class_name: 'User', foreign_key: 'created_by_user_id'
  belongs_to :updated_by, class_name: 'User', foreign_key: 'updated_by_user_id'

  has_many :people_notes, dependent: :destroy
  has_many :notes, through: :people_notes, dependent: :destroy
  has_many :visits, dependent: :destroy
  has_many :services, dependent: :destroy

  store :address, accessors: [:street1, :street2, :city, :state, :zip], coder: JSON

  # acts_as_taggable TODO - add this back in

  def service_for_date(date)
    services.where(Service.arel_table[:start_date].lteq(date))
            .where(Service.arel_table[:end_date].gteq(date)).first
  end

  def full_name
    "#{first_name} #{last_name}"
  end
end
