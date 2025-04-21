module OldFreehubData
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true
    # use the old database
    connects_to database: { writing: :old, reading: :old }
  end
end
