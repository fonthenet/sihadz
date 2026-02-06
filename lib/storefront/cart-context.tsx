'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import type { StorefrontProduct, CartItem, Cart } from './types'

// ============================================================================
// TYPES
// ============================================================================

interface CartState {
  professional_id: string | null
  items: CartItem[]
  isOpen: boolean
}

type CartAction =
  | { type: 'ADD_ITEM'; product: StorefrontProduct; quantity?: number }
  | { type: 'REMOVE_ITEM'; product_id: string }
  | { type: 'UPDATE_QUANTITY'; product_id: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'SET_OPEN'; isOpen: boolean }
  | { type: 'LOAD_CART'; state: CartState }

interface CartContextValue {
  state: CartState
  addItem: (product: StorefrontProduct, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (isOpen: boolean) => void
  getSubtotal: () => number
  getItemCount: () => number
}

// ============================================================================
// REDUCER
// ============================================================================

const initialState: CartState = {
  professional_id: null,
  items: [],
  isOpen: false,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const product = action.product
      const quantity = action.quantity || 1

      // If adding from a different store, clear cart first
      if (state.professional_id && state.professional_id !== product.professional_id) {
        return {
          professional_id: product.professional_id,
          items: [{ product_id: product.id, product, quantity }],
          isOpen: true,
        }
      }

      // Check if item already exists
      const existingIndex = state.items.findIndex(i => i.product_id === product.id)
      if (existingIndex >= 0) {
        const newItems = [...state.items]
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
        }
        return { ...state, items: newItems, isOpen: true }
      }

      return {
        professional_id: product.professional_id,
        items: [...state.items, { product_id: product.id, product, quantity }],
        isOpen: true,
      }
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(i => i.product_id !== action.product_id)
      return {
        ...state,
        items: newItems,
        professional_id: newItems.length === 0 ? null : state.professional_id,
      }
    }

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', product_id: action.product_id })
      }
      const newItems = state.items.map(item =>
        item.product_id === action.product_id
          ? { ...item, quantity: action.quantity }
          : item
      )
      return { ...state, items: newItems }
    }

    case 'CLEAR_CART':
      return { ...initialState }

    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen }

    case 'SET_OPEN':
      return { ...state, isOpen: action.isOpen }

    case 'LOAD_CART':
      return action.state

    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'dzd_storefront_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        dispatch({ type: 'LOAD_CART', state: { ...parsed, isOpen: false } })
      }
    } catch (error) {
      console.error('Error loading cart:', error)
    }
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      const toStore = { ...state, isOpen: false }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (error) {
      console.error('Error saving cart:', error)
    }
  }, [state.items, state.professional_id])

  const addItem = (product: StorefrontProduct, quantity?: number) => {
    dispatch({ type: 'ADD_ITEM', product, quantity })
  }

  const removeItem = (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', product_id: productId })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', product_id: productId, quantity })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' })
  }

  const setCartOpen = (isOpen: boolean) => {
    dispatch({ type: 'SET_OPEN', isOpen })
  }

  const getSubtotal = () => {
    return state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }

  const getItemCount = () => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart,
        setCartOpen,
        getSubtotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
