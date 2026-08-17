class Note < ApplicationRecord
  belongs_to :organization
  belongs_to :person, optional: true
  belongs_to :visit, optional: true
  belongs_to :service, optional: true
end
