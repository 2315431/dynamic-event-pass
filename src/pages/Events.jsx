import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Calendar, MapPin, Users, Star, Grid, List } from 'lucide-react'

const Events = () => {
  const [viewMode, setViewMode] = useState('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const categories = [
    { id: 'all', name: 'All Events', count: 156 },
    { id: 'technology', name: 'Technology', count: 45 },
    { id: 'music', name: 'Music', count: 32 },
    { id: 'sports', name: 'Sports', count: 28 },
    { id: 'business', name: 'Business', count: 19 },
    { id: 'arts', name: 'Arts', count: 15 },
    { id: 'food', name: 'Food', count: 12 },
    { id: 'education', name: 'Education', count: 8 }
  ]

  const events = [
    {
      id: 1,
      title: "Tech Conference 2024",
      date: "2024-03-15",
      time: "09:00 AM",
      venue: "Convention Center",
      city: "San Francisco",
      price: "$99",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=300&fit=crop",
      category: "technology",
      rating: 4.8,
      attendees: 1200,
      description: "Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations."
    },
    {
      id: 2,
      title: "Music Festival",
      date: "2024-04-20",
      time: "06:00 PM",
      venue: "Central Park",
      city: "New York",
      price: "$149",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&h=300&fit=crop",
      category: "music",
      rating: 4.9,
      attendees: 5000,
      description: "A spectacular music festival featuring top artists from around the world."
    },
    {
      id: 3,
      title: "Startup Pitch Night",
      date: "2024-05-10",
      time: "07:00 PM",
      venue: "Innovation Hub",
      city: "Austin",
      price: "$49",
      image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=500&h=300&fit=crop",
      category: "business",
      rating: 4.7,
      attendees: 300,
      description: "Watch innovative startups pitch their ideas to investors and industry experts."
    },
    {
      id: 4,
      title: "Art Exhibition Opening",
      date: "2024-03-22",
      time: "06:30 PM",
      venue: "Modern Art Gallery",
      city: "Los Angeles",
      price: "$25",
      image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=500&h=300&fit=crop",
      category: "arts",
      rating: 4.6,
      attendees: 150,
      description: "Experience contemporary art from emerging and established artists."
    },
    {
      id: 5,
      title: "Food & Wine Tasting",
      date: "2024-04-05",
      time: "07:00 PM",
      venue: "Grand Hotel",
      city: "Napa Valley",
      price: "$89",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&h=300&fit=crop",
      category: "food",
      rating: 4.9,
      attendees: 200,
      description: "Indulge in exquisite food and wine pairings from renowned chefs."
    },
    {
      id: 6,
      title: "Basketball Championship",
      date: "2024-04-15",
      time: "08:00 PM",
      venue: "Sports Arena",
      city: "Chicago",
      price: "$75",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&h=300&fit=crop",
      category: "sports",
      rating: 4.8,
      attendees: 15000,
      description: "Watch the championship game between the top two teams."
    }
  ]

  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.city.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Events</h1>
          <p className="text-lg text-gray-600">Find amazing events happening in your city</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events, venues, artists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="lg:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-3 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-3 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredEvents.length} of {events.length} events
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Most Popular</option>
              <option>Newest First</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Date: Soonest</option>
            </select>
          </div>
        </div>

        {/* Events Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <div key={event.id} className="card overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                <div className="relative">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium capitalize">
                      {event.category}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <div className="bg-white bg-opacity-90 rounded-full px-2 py-1 flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="ml-1 text-sm font-medium">{event.rating}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{event.venue}, {event.city}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{event.attendees.toLocaleString()} attendees</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-2xl font-bold text-primary-600">{event.price}</div>
                    <Link
                      to={`/booking/${event.id}`}
                      className="btn btn-primary btn-md"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="card p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="lg:w-64 flex-shrink-0">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-48 lg:h-32 object-cover rounded-lg"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{event.venue}, {event.city}</span>
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                            <span>{event.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right mt-4 lg:mt-0">
                        <div className="text-2xl font-bold text-primary-600 mb-2">{event.price}</div>
                        <Link
                          to={`/booking/${event.id}`}
                          className="btn btn-primary btn-md"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{event.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{event.attendees.toLocaleString()} attendees</span>
                      </div>
                      <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                        {event.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredEvents.length > 0 && (
          <div className="text-center mt-12">
            <button className="btn btn-outline btn-lg">
              Load More Events
            </button>
          </div>
        )}

        {/* No Results */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or browse all events
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
              }}
              className="btn btn-primary btn-md"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Events