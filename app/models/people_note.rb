class PeopleNote < ApplicationRecord
  belongs_to :person
  belongs_to :note
end
