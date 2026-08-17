class ImportJob < ApplicationRecord
  belongs_to :organization
  belongs_to :created_by_user, class_name: "User"
  has_many :import_rows, dependent: :destroy
end
