# frozen_string_literal: true

class Organizations::PersonCheckInComponent < ViewComponent::Base
  def initialize(org:)
    @org = org
  end
end
