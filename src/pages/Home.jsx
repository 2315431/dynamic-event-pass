import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Star, ArrowRight, Search, Filter } from 'lucide-react'

const Home = () => {
  const featuredEvents = [
    {
      id: 1,
      title: "Tech Conference 2024",
      date: "2024-03-15",
      time: "09:00 AM",
      venue: "Convention Center",
      city: "San Francisco",
      price: "$99",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=300&fit=crop",
      category: "Technology",
      rating: 4.8,
      attendees: 1200
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
      category: "Music",
      rating: 4.9,
      attendees: 5000
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
      category: "Business",
      rating: 4.7,
      attendees: 300
    }
  ]

  const categories = [
    { name: "Technology", icon: "💻", count: 45 },
    { name: "Music", icon: "🎵", count: 32 },
    { name: "Sports", icon: "⚽", count: 28 },
    { name: "Business", icon: "💼", count: 19 },
    { name: "Arts", icon: "🎨", count: 15 },
    { name: "Food", icon: "🍕", count: 12 }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Amazing Events
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Book tickets for the best events in your city
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search events, venues, artists..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select className="pl-10 pr-8 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white min-w-[200px]">
                    <option>All Cities</option>
                    <option>San Francisco</option>
                    <option>New York</option>
                    <option>Austin</option>
                    <option>Los Angeles</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-lg px-8">
                  Search Events
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-lg text-gray-600">Find events that match your interests</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                to="/events"
                className="group p-6 rounded-lg border-2 border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all duration-200 text-center"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500">{category.count} events</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Events</h2>
              <p className="text-lg text-gray-600">Don't miss these popular events</p>
            </div>
            <Link to="/events" className="btn btn-outline btn-md">
              View All Events
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <div key={event.id} className="card overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                <div className="relative">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Create Your Event?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of event organizers who trust us with their ticketing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg">
              Create Event
            </button>
            <Link to="/validator" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 btn-lg">
              Validate Tickets
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home