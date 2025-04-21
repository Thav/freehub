module OldFreehubData
  # == Schema Information
  #
  # Table name: organizations
  #
  #  id                :integer(4)      not null, primary key
  #  name              :string(255)
  #  key               :string(255)
  #  timezone          :string(255)
  #  created_at        :datetime
  #  updated_at        :datetime
  #  location          :string(255)
  #  display_start_end :boolean(1)
  #
  class Organization < OldFreehubData::ApplicationRecord
  end
end
