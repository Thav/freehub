module OldFreehubData
  # == Schema Information
  #
  # Table name: people
  #
  #  id              :integer(4)      not null, primary key
  #  first_name      :string(255)
  #  last_name       :string(255)
  #  full_name       :string(255)
  #  street1         :string(255)
  #  street2         :string(255)
  #  city            :string(255)
  #  state           :string(255)
  #  postal_code     :string(255)
  #  country         :string(255)
  #  email           :string(255)
  #  email_opt_out   :boolean(1)      default(FALSE)
  #  phone           :string(255)
  #  staff           :boolean(1)      default(FALSE)
  #  created_at      :datetime
  #  updated_at      :datetime
  #  created_by_id   :integer(4)
  #  updated_by_id   :integer(4)
  #  organization_id :integer(4)
  #  yob             :integer(4)
  #  volunteer_hours :float
  #  project_hours   :float
  #
  class Person < OldFreehubData::ApplicationRecord
    belongs_to :organization
    belongs_to :created_by, class_name: 'User'
    belongs_to :updated_by, class_name: 'User'
    acts_as_taggable
  end
end
