module ServiceType
  data = Data.define(:label, :description)

  MEMBERSHIP = data['Membership', 'Membership for this shop.']
  EAB = data['Earn a Bike/Digging Rights', 'One of everything you can find in the shop to build or fix one bike.']
  CLASS = data['Class', 'Membership for this shop.']

  def self.all
    constants.map { |key| const_get(key) }
  end

  def self.find(key)
    const_get(key)
  end
end
