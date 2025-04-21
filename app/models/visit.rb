class Visit < ApplicationRecord
  belongs_to :note, optional: true
  belongs_to :person
  belongs_to :organization
  belongs_to :created_by, class_name: 'User', foreign_key: 'created_by_user_id'
  belongs_to :updated_by, class_name: 'User', foreign_key: 'updated_by_user_id'

  def member?
    person.service_for_date(arrived_at).present?
  end
end
