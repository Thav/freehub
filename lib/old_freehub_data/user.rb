module OldFreehubData
  # == Schema Information
  #
  # Table name: users
  #
  #  id                        :integer(4)      not null, primary key
  #  login                     :string(255)
  #  email                     :string(255)
  #  name                      :string(255)
  #  crypted_password          :string(40)
  #  salt                      :string(40)
  #  remember_token            :string(255)
  #  remember_token_expires_at :datetime
  #  activation_code           :string(40)
  #  activated_at              :datetime
  #  reset_code                :string(40)
  #  created_at                :datetime
  #  updated_at                :datetime
  #
  class User < OldFreehubData::ApplicationRecord
  end
end
