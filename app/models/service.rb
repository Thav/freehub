require 'service_type'

class Service < ApplicationRecord
  belongs_to :note
  belongs_to :person

  delegate :label, :description, to: :type

  def type
    ServiceType.find(service_type) if service_type.present?
  end
end
