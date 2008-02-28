class Organization < ActiveRecord::Base
  validates_presence_of :name, :timezone

  acts_as_authorizable
  
  def initialize(attributes=nil)
    super(attributes)
    self[:timezone] ||= 'Pacific'
  end
end
