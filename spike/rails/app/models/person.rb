class Person < ApplicationRecord
  belongs_to :organization
  has_many :visits, dependent: :destroy
  has_many :person_tags, dependent: :destroy
  has_many :tags, through: :person_tags
  has_many :notes, dependent: :destroy
  def member_today?
    services.where(type: "membership").where("start_date IS NULL OR start_date <= ?", Date.current).where("end_date IS NULL OR end_date >= ?", Date.current).exists?
  end
  has_many :services, dependent: :destroy
end
