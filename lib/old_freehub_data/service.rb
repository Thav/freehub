module OldFreehubData
  # == Schema Information
  #
  # Table name: services
  #
  #  id              :integer(4)      not null, primary key
  #  start_date      :date
  #  end_date        :date
  #  paid            :boolean(1)      default(FALSE)
  #  volunteered     :boolean(1)      default(FALSE)
  #  service_type_id :string(255)
  #  person_id       :integer(4)
  #  created_at      :datetime
  #  updated_at      :datetime
  #  created_by_id   :integer(4)
  #  updated_by_id   :integer(4)
  #
  class Service < OldFreehubData::ApplicationRecord
    belongs_to :person
  end
end
