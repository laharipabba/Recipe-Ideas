import { useState, useEffect } from 'react'
import { Modal, Button, Card, Row, Col, Container, Form, Alert, Spinner, Navbar, Nav, Dropdown } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('name') // 'name', 'ingredient', 'mood', 'time'
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [recipeDetails, setRecipeDetails] = useState(null)
  const [cookingTime, setCookingTime] = useState('')
  const [dietaryPrefs, setDietaryPrefs] = useState([])
  const [mood, setMood] = useState('')
  const [favorites, setFavorites] = useState([])
  const [currentPage, setCurrentPage] = useState('home')
  const [userRecipes, setUserRecipes] = useState([])
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false)
  const [newRecipe, setNewRecipe] = useState({
    strMeal: '',
    strCategory: '',
    strInstructions: '',
    ingredients: [{ measure: '', ingredient: '' }]
  })

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/categories.php')
      const data = await response.json()
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchRecipes = async () => {
    if (!query.trim() && searchType !== 'mood' && searchType !== 'time') return

    setLoading(true)
    setError('')
    try {
      let url = ''
      let filteredRecipes = []

      if (searchType === 'ingredient') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${query}`
      } else if (searchType === 'name') {
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`
      } else if (searchType === 'mood') {
        // Map mood to categories
        const moodCategories = {
          'comforting': ['Beef', 'Chicken', 'Pork'],
          'light': ['Vegetarian', 'Seafood', 'Salad'],
          'spicy': ['Chicken', 'Beef', 'Pork'],
          'healthy': ['Vegetarian', 'Salad', 'Vegan'],
          'quick': ['Chicken', 'Beef', 'Pasta'],
          'indulgent': ['Dessert', 'Pasta', 'Beef']
        }
        const selectedCategories = moodCategories[mood] || []
        for (const category of selectedCategories) {
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`)
          const data = await response.json()
          if (data.meals) {
            filteredRecipes = [...filteredRecipes, ...data.meals.slice(0, 5)] // Limit to 5 per category
          }
        }
      } else if (searchType === 'time') {
        // Get recipes and filter by estimated cooking time
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=')
        const data = await response.json()
        if (data.meals) {
          filteredRecipes = data.meals.filter(meal => {
            // Simple time estimation based on instructions length
            const instructionLength = meal.strInstructions ? meal.strInstructions.length : 0
            if (cookingTime === '15') return instructionLength < 500
            if (cookingTime === '30') return instructionLength >= 500 && instructionLength < 1000
            if (cookingTime === '60') return instructionLength >= 1000
            return true
          })
        }
      }

      if (url) {
        const response = await fetch(url)
        const data = await response.json()
        if (data.meals) {
          filteredRecipes = data.meals
        }
      }

      // Apply dietary preferences filter
      if (dietaryPrefs.length > 0) {
        filteredRecipes = filteredRecipes.filter(recipe => {
          const ingredients = getIngredients(recipe)
          return dietaryPrefs.every(pref => {
            if (pref === 'vegetarian') {
              return !ingredients.some(ing => ing.toLowerCase().includes('chicken') || ing.toLowerCase().includes('beef') || ing.toLowerCase().includes('pork') || ing.toLowerCase().includes('fish'))
            }
            if (pref === 'vegan') {
              return !ingredients.some(ing => ing.toLowerCase().includes('chicken') || ing.toLowerCase().includes('beef') || ing.toLowerCase().includes('pork') || ing.toLowerCase().includes('fish') || ing.toLowerCase().includes('milk') || ing.toLowerCase().includes('cheese') || ing.toLowerCase().includes('egg'))
            }
            return true
          })
        })
      }

      // Combine API recipes with user recipes
      const allRecipes = [...filteredRecipes, ...userRecipes.filter(recipe =>
        recipe.strMeal.toLowerCase().includes(query.toLowerCase()) ||
        recipe.ingredients.some(ing => ing.ingredient.toLowerCase().includes(query.toLowerCase()))
      )]

      if (allRecipes.length > 0) {
        setRecipes(allRecipes)
      } else {
        setRecipes([])
        setError(`No recipes found matching your criteria. Try adjusting your preferences or add your own recipe!`)
      }
    } catch (err) {
      setError('Failed to fetch recipes. Please try again.')
    }
    setLoading(false)
  }

  const fetchRecipesByCategory = async (category) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`)
      const data = await response.json()
      if (data.meals) {
        setRecipes(data.meals)
      } else {
        setRecipes([])
        setError(`No recipes found for ${category} category.`)
      }
    } catch (err) {
      setError('Failed to fetch recipes. Please try again.')
    }
    setLoading(false)
  }

  const fetchRandomRecipes = async () => {
    setLoading(true)
    setError('')
    try {
      const randomRecipes = []
      for (let i = 0; i < 10; i++) {
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
        const data = await response.json()
        if (data.meals && data.meals[0]) {
          randomRecipes.push(data.meals[0])
        }
      }
      setRecipes(randomRecipes)
    } catch (err) {
      setError('Failed to fetch random recipes. Please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
    fetchRandomRecipes() // Load some random recipes on initial load
    // Load user recipes from localStorage
    const savedRecipes = localStorage.getItem('userRecipes')
    if (savedRecipes) {
      setUserRecipes(JSON.parse(savedRecipes))
    }
  }, [])

  const fetchRecipeDetails = async (id) => {
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      const data = await response.json()
      if (data.meals && data.meals[0]) {
        setRecipeDetails(data.meals[0])
      }
    } catch (err) {
      console.error('Failed to fetch recipe details:', err)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchRecipes()
  }

  const handleCategorySelect = (category) => {
    fetchRecipesByCategory(category)
  }

  const handleMoodSelect = (selectedMood) => {
    setMood(selectedMood)
    setSearchType('mood')
    fetchRecipes()
  }

  const handleTimeSelect = (time) => {
    setCookingTime(time)
    setSearchType('time')
    fetchRecipes()
  }

  const handleDietaryPrefChange = (pref) => {
    setDietaryPrefs(prev =>
      prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    )
  }

  const toggleFavorite = (recipe) => {
    setFavorites(prev =>
      prev.some(fav => fav.idMeal === recipe.idMeal)
        ? prev.filter(fav => fav.idMeal !== recipe.idMeal)
        : [...prev, recipe]
    )
  }

  const addIngredient = () => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { measure: '', ingredient: '' }]
    }))
  }

  const updateIngredient = (index, field, value) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    }))
  }

  const removeIngredient = (index) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const saveRecipe = () => {
    if (!newRecipe.strMeal.trim() || !newRecipe.strInstructions.trim()) {
      alert('Please fill in at least the recipe name and instructions.')
      return
    }

    const recipeToSave = {
      ...newRecipe,
      idMeal: `user_${Date.now()}`,
      strMealThumb: 'https://via.placeholder.com/300x200?text=Your+Recipe',
      isUserRecipe: true
    }

    const updatedRecipes = [...userRecipes, recipeToSave]
    setUserRecipes(updatedRecipes)
    localStorage.setItem('userRecipes', JSON.stringify(updatedRecipes))

    // Reset form
    setNewRecipe({
      strMeal: '',
      strCategory: '',
      strInstructions: '',
      ingredients: [{ measure: '', ingredient: '' }]
    })
    setShowAddRecipeModal(false)

    // Show success message
    alert('Recipe added successfully!')
  }

  const navigateToPage = (page) => {
    setCurrentPage(page)
  }

  const handleRecipeClick = async (recipe) => {
    setSelectedRecipe(recipe)
    setShowModal(true)
    await fetchRecipeDetails(recipe.idMeal)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedRecipe(null)
    setRecipeDetails(null)
  }

  const getIngredients = (recipe) => {
    const ingredients = []
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`]
      const measure = recipe[`strMeasure${i}`]
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure} ${ingredient}`)
      }
    }
    return ingredients
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'about':
        return (
          <Container fluid className="py-5">
            <Row className="justify-content-center">
              <Col xs={12} md={10} lg={8}>
                <h1 className="text-center mb-4">About Recipe Ideas</h1>
                <div className="text-center mb-5">
                  <img
                    src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                    alt="Cooking"
                    className="img-fluid rounded shadow mb-4"
                    style={{ maxHeight: '400px', objectFit: 'cover' }}
                  />
                </div>
                <p className="lead text-center mb-4">
                  Welcome to Recipe Ideas, your personal kitchen companion designed for busy professionals like Taylor.
                </p>
                <Row className="mt-5">
                  <Col md={6}>
                    <h3>🎯 Our Mission</h3>
                    <p>
                      We understand that coming home after a long day at work, the last thing you want to do is spend hours
                      deciding what to cook. That's why we created Recipe Ideas - to make meal planning effortless and enjoyable.
                    </p>
                  </Col>
                  <Col md={6}>
                    <h3>🚀 Smart Features</h3>
                    <ul>
                      <li><strong>Mood-Based Cooking:</strong> Tell us how you're feeling, and we'll suggest the perfect meal</li>
                      <li><strong>Time-Saving Filters:</strong> Quick recipes for busy nights, elaborate ones for weekends</li>
                      <li><strong>Ingredient Search:</strong> Use what you have in your kitchen</li>
                      <li><strong>Dietary Preferences:</strong> Vegetarian, vegan, or custom filters</li>
                      <li><strong>Favorites System:</strong> Save your go-to recipes</li>
                    </ul>
                  </Col>
                </Row>
                <Row className="mt-4">
                  <Col md={12}>
                    <h3>👨‍💼 Designed for Professionals</h3>
                    <p>
                      Whether you're a busy executive, a working parent, or someone who just wants to enjoy cooking without the stress,
                      Recipe Ideas adapts to your lifestyle. No more staring at your fridge wondering what to make - let us help you
                      create memorable meals in the time you have available.
                    </p>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Container>
        )
      case 'contact':
        return (
          <Container fluid className="py-5">
            <Row className="justify-content-center">
              <Col xs={12} md={10} lg={8}>
                <h1 className="text-center mb-4">Contact Us</h1>
                <div className="text-center mb-5">
                  <img
                    src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                    alt="Contact"
                    className="img-fluid rounded shadow mb-4"
                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                  />
                </div>
                <Row>
                  <Col xs={12} md={6}>
                    <h3>Get in Touch</h3>
                    <p className="mb-4">
                      We'd love to hear from you! Whether you have feedback, suggestions, or just want to say hello,
                      feel free to reach out.
                    </p>
                    <div className="mb-3">
                      <strong>📧 Email:</strong> hello@recipeideas.com
                    </div>
                    <div className="mb-3">
                      <strong>📱 Support:</strong> support@recipeideas.com
                    </div>
                    <div className="mb-3">
                      <strong>🐛 Bug Reports:</strong> bugs@recipeideas.com
                    </div>
                  </Col>
                  <Col xs={12} md={6}>
                    <h3>Follow Us</h3>
                    <p className="mb-4">
                      Stay connected and get the latest updates on new features and recipes.
                    </p>
                    <div className="mb-3">
                      <strong>📘 Facebook:</strong> @RecipeIdeasApp
                    </div>
                    <div className="mb-3">
                      <strong>📷 Instagram:</strong> @recipe_ideas_official
                    </div>
                    <div className="mb-3">
                      <strong>🐦 Twitter:</strong> @RecipeIdeasApp
                    </div>
                    <div className="mb-3">
                      <strong>📺 YouTube:</strong> Recipe Ideas Channel
                    </div>
                  </Col>
                </Row>
                <Row className="mt-4">
                  <Col md={12}>
                    <h3>💡 Have an Idea?</h3>
                    <p>
                      We're always looking to improve Recipe Ideas. If you have a feature request or suggestion,
                      we'd love to hear it. Your feedback helps us make the app better for everyone.
                    </p>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Container>
        )
      default:
        return (
          <>
            <div className="hero-section">
              <Container fluid className="py-5">
                <Row className="align-items-center">
                  <Col md={6} className="text-center text-md-start">
                    <h1 className="display-4 mb-4">Discover Amazing Recipes</h1>
                    <p className="lead mb-4">Find recipes by name, ingredient, mood, cooking time, or dietary preferences</p>
                    <Form onSubmit={handleSubmit} className="mb-4">
                      <Row className="justify-content-center justify-content-md-start">
                        <Col xs={12} sm={8} md={8} lg={6}>
                          <Form.Control
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search recipes by name or ingredient..."
                            className="mb-2"
                          />
                        </Col>
                        <Col xs={6} sm={2} md={2}>
                          <Form.Select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="mb-2"
                          >
                            <option value="name">Name</option>
                            <option value="ingredient">Ingredient</option>
                            <option value="mood">Mood</option>
                            <option value="time">Time</option>
                          </Form.Select>
                        </Col>
                        <Col xs={6} sm={2} md={2}>
                          <Button type="submit" disabled={loading} variant="primary" className="w-100">
                            {loading ? <Spinner animation="border" size="sm" /> : 'Search'}
                          </Button>
                        </Col>
                      </Row>
                      <Row className="justify-content-center justify-content-md-start">
                        <Col xs={12} md={8} lg={6}>
                          <div className="mb-2">
                            <Form.Check
                              inline
                              type="checkbox"
                              id="vegetarian"
                              label="Vegetarian"
                              checked={dietaryPrefs.includes('vegetarian')}
                              onChange={() => handleDietaryPrefChange('vegetarian')}
                            />
                            <Form.Check
                              inline
                              type="checkbox"
                              id="vegan"
                              label="Vegan"
                              checked={dietaryPrefs.includes('vegan')}
                              onChange={() => handleDietaryPrefChange('vegan')}
                            />
                          </div>
                        </Col>
                      </Row>
                    </Form>
                  </Col>
                  <Col md={6} className="text-center">
                    <img
                      src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                      alt="Delicious food"
                      className="img-fluid rounded hero-image"
                    />
                  </Col>
                </Row>
              </Container>
            </div>

            <Container fluid className="py-5">
              {error && (
                <Alert variant="danger" className="text-center">
                  {error}
                  <div className="mt-3">
                    <Button
                      variant="outline-light"
                      onClick={() => setShowAddRecipeModal(true)}
                      className="ms-2"
                    >
                      ➕ Add Your Own Recipe
                    </Button>
                  </div>
                </Alert>
              )}
              <Row className="justify-content-center">
                {recipes.map((recipe) => (
                  <Col key={recipe.idMeal} xs={12} sm={6} md={4} lg={3} xl={2} className="mb-4 d-flex">
                  <Card className="h-100 recipe-card w-100" onClick={() => handleRecipeClick(recipe)} style={{ cursor: 'pointer' }}>
                    <Card.Img variant="top" src={recipe.strMealThumb} alt={recipe.strMeal} />
                  <Card.Body className="d-flex flex-column">
                      <Card.Title className="text-center flex-grow-1">{recipe.strMeal}</Card.Title>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <Button
                          variant={favorites.some(fav => fav.idMeal === recipe.idMeal) ? "warning" : "outline-warning"}
                          size="sm"
                          className="favorite-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(recipe)
                          }}
                        >
                          {favorites.some(fav => fav.idMeal === recipe.idMeal) ? "★" : "☆"}
                        </Button>
                        {recipe.isUserRecipe && (
                          <span className="badge bg-info text-dark">Your Recipe</span>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                  </Col>
                ))}
              </Row>
            </Container>
          </>
        )
    }
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-0" sticky="top">
        <Container fluid>
          <Navbar.Brand
            onClick={() => {
              navigateToPage('home')
              fetchRandomRecipes()
            }}
            style={{ cursor: 'pointer' }}
          >
            Recipe Ideas
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link
                onClick={() => {
                  navigateToPage('home')
                  fetchRandomRecipes()
                }}
                className={currentPage === 'home' ? 'active' : ''}
              >
                Home
              </Nav.Link>
              <Dropdown>
                <Dropdown.Toggle variant="dark" id="dropdown-basic">
                  Categories
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {categories.map((category) => (
                    <Dropdown.Item
                      key={category.idCategory}
                      onClick={() => handleCategorySelect(category.strCategory)}
                    >
                      {category.strCategory}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              <Dropdown>
                <Dropdown.Toggle variant="dark" id="mood-dropdown">
                  I'm in the Mood for
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleMoodSelect('comforting')}>Comforting Food</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleMoodSelect('light')}>Light & Fresh</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleMoodSelect('spicy')}>Something Spicy</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleMoodSelect('healthy')}>Healthy Options</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleMoodSelect('quick')}>Quick & Easy</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleMoodSelect('indulgent')}>Indulgent Treat</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Dropdown>
                <Dropdown.Toggle variant="dark" id="time-dropdown">
                  Cooking Time
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleTimeSelect('15')}>Under 15 mins</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleTimeSelect('30')}>Under 30 mins</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleTimeSelect('60')}>Under 1 hour</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
            <Nav>
              <Nav.Link onClick={() => setRecipes(favorites)}>Favorites ({favorites.length})</Nav.Link>
              <Nav.Link
                onClick={() => navigateToPage('about')}
                className={currentPage === 'about' ? 'active' : ''}
              >
                About
              </Nav.Link>
              <Nav.Link
                onClick={() => navigateToPage('contact')}
                className={currentPage === 'contact' ? 'active' : ''}
              >
                Contact
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {renderPage()}

      <footer className="bg-dark text-light py-4 mt-5">
        <Container>
          <Row>
            <Col md={4}>
              <h5>Recipe Ideas</h5>
              <p>Discover delicious recipes from around the world. Search by ingredients, names, or browse by categories.</p>
            </Col>
            <Col md={4}>
              <h5>Quick Links</h5>
              <ul className="list-unstyled">
                <li><a href="#home" className="text-light">Home</a></li>
                <li><a href="#categories" className="text-light">Categories</a></li>
                <li><a href="#about" className="text-light">About</a></li>
                <li><a href="#contact" className="text-light">Contact</a></li>
              </ul>
            </Col>
            <Col md={4}>
              <h5>Follow Us</h5>
              <div>
                <a href="#" className="text-light me-3">Facebook</a>
                <a href="#" className="text-light me-3">Twitter</a>
                <a href="#" className="text-light me-3">Instagram</a>
                <a href="#" className="text-light">YouTube</a>
              </div>
            </Col>
          </Row>
          <hr />
          <div className="text-center">
            <p>&copy; 2024 Recipe Ideas. All rights reserved.</p>
          </div>
        </Container>
      </footer>

      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-center w-100">{selectedRecipe?.strMeal}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {recipeDetails ? (
            <Row>
              <Col xs={12} md={6} className="mb-3">
                <img src={recipeDetails.strMealThumb} alt={recipeDetails.strMeal} className="img-fluid rounded" />
              </Col>
              <Col xs={12} md={6}>
                <h5>Ingredients:</h5>
                <ul className="list-unstyled">
                  {getIngredients(recipeDetails).map((ingredient, index) => (
                    <li key={index} className="mb-1">• {ingredient}</li>
                  ))}
                </ul>
              </Col>
              <Col xs={12} className="mt-3">
                <h5>Instructions:</h5>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                  {recipeDetails.strInstructions}
                </div>
              </Col>
              {selectedRecipe?.isUserRecipe && (
                <Col xs={12} className="mt-3">
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        // Edit functionality could be added here
                        alert('Edit functionality coming soon!')
                      }}
                    >
                      ✏️ Edit Recipe
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this recipe?')) {
                          const updatedRecipes = userRecipes.filter(r => r.idMeal !== selectedRecipe.idMeal)
                          setUserRecipes(updatedRecipes)
                          localStorage.setItem('userRecipes', JSON.stringify(updatedRecipes))
                          handleCloseModal()
                          alert('Recipe deleted successfully!')
                        }
                      }}
                    >
                      🗑️ Delete Recipe
                    </Button>
                  </div>
                </Col>
              )}
            </Row>
          ) : (
            <div className="text-center">
              <Spinner animation="border" />
              <p>Loading recipe details...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAddRecipeModal} onHide={() => setShowAddRecipeModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Your Own Recipe</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Recipe Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={newRecipe.strMeal}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, strMeal: e.target.value }))}
                    placeholder="Enter recipe name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    value={newRecipe.strCategory}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, strCategory: e.target.value }))}
                    placeholder="e.g., Chicken, Dessert, Vegetarian"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Ingredients</Form.Label>
              {newRecipe.ingredients.map((ing, index) => (
                <Row key={index} className="mb-2">
                  <Col xs={4}>
                    <Form.Control
                      type="text"
                      placeholder="Measure (e.g., 1 cup)"
                      value={ing.measure}
                      onChange={(e) => updateIngredient(index, 'measure', e.target.value)}
                    />
                  </Col>
                  <Col xs={6}>
                    <Form.Control
                      type="text"
                      placeholder="Ingredient (e.g., flour)"
                      value={ing.ingredient}
                      onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                    />
                  </Col>
                  <Col xs={2}>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      disabled={newRecipe.ingredients.length === 1}
                    >
                      ✕
                    </Button>
                  </Col>
                </Row>
              ))}
              <Button variant="outline-primary" size="sm" onClick={addIngredient}>
                + Add Ingredient
              </Button>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Instructions *</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={newRecipe.strInstructions}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, strInstructions: e.target.value }))}
                placeholder="Enter cooking instructions step by step..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddRecipeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveRecipe}>
            Save Recipe
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default App
