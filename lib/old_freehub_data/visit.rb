module OldFreehubData
  # == Schema Information
  #
  # Table name: visits
  #
  #  id            :integer(4)      not null, primary key
  #  arrived_at    :datetime
  #  volunteer     :boolean(1)      default(FALSE)
  #  created_at    :datetime
  #  updated_at    :datetime
  #  created_by_id :integer(4)
  #  updated_by_id :integer(4)
  #  person_id     :integer(4)
  #  staff         :boolean(1)
  #  member        :boolean(1)
  #  start_at      :datetime
  #  end_at        :datetime
  #  duration      :float
  #
  class Visit < OldFreehubData::ApplicationRecord
    belongs_to :person
  end
end
