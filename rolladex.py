import sqlite3
import os.path
import romkan

class Server():
	def __init__(self, args):
		if not os.path.isfile(args[0]):
			print("Creating a new database: "+args[0])
		else:
			print("Loading database : "+args[0])
		self.db = sqlite3.connect(args[0])
		self.db.row_factory = sqlite3.Row
		cur = self.db.cursor()
		cur.executescript("""
			CREATE TABLE IF NOT EXISTS company (
				id INTEGER PRIMARY KEY,
				name TEXT NOT NULL UNIQUE,
				yomi TEXT,
				area TEXT,
				web TEXT,
				phone TEXT,
				fax TEXT,
				email TEXT,
				address TEXT,
				memo TEXT
				);
				
			CREATE TABLE IF NOT EXISTS product (
				id INTEGER PRIMARY KEY,
				parent INTEGER,
				name TEXT NOT NULL UNIQUE,
				yomi TEXT,
				image BLOB,
				thumb BLOB
				);
			
			CREATE TABLE IF NOT EXISTS stock (
				companyid INTEGER,
				productid INTEGER,
				size TEXT,
				price INTEGER,
				memo TEXT
				);
			
			""")
		cur.execute("SELECT COUNT(id) from company")
		one = cur.fetchone()
		if one[0] == 0:
			cur.execute('INSERT INTO company (name) VALUES ("Testing")')
		self.db.commit()
		
	
	def fini(self):
		print("Closing Database")
		self.db.close()
	
	
	
	def rpc_stock_new(self, id):
		cur = self.db.cursor()
		cur.execute("INSERT INTO stock (companyid, productid) VALUES (?, 0)", (id,))
		self.db.commit()
		cur.execute("SELECT rowid, companyid, productid, size, price, memo FROM stock WHERE rowid=?", (cur.lastrowid,))
		return dict(cur.fetchone())
	
	def rpc_stock_edit(self, rowid, field, value):
		cur = self.db.cursor()
		print("UPDATE stock [%d] %s -> %s"%(rowid, field, value))
		cur.execute("UPDATE stock SET %s=? WHERE rowid=?"%field, (value, rowid))
		self.db.commit()
		return cur.lastrowid
	
	def rpc_stock_fetchall(self, id):
		cur = self.db.cursor()
		cur.execute("SELECT rowid, companyid, productid, size, price, memo FROM stock WHERE companyid=?", (id,))
		return [dict(row) for row in cur.fetchall()]
		
	def rpc_company_fetchall(self):
		cur = self.db.cursor()
		cur.execute("SELECT id, name, yomi FROM company")
		all= [dict(r) for r in cur.fetchall()]
		return all
	
	def rpc_company_fetchone(self, id):
		cur = self.db.cursor()
		cur.execute("SELECT * FROM company WHERE id=?", (id,))
		return dict(cur.fetchone())

	def rpc_company_new(self, name):
		cur = self.db.cursor()
		try:
			cur.execute("INSERT INTO company (name) VALUES (?)", (name,))
			self.db.commit()
			cur.execute("SELECT id, name, yomi FROM company WHERE id=?", (cur.lastrowid, ))
			return dict(cur.fetchone())
		except:
			return {"id":"0"}
			
	def rpc_company_edit(self, id, field, value):
		cur = self.db.cursor()
		print("UPDATE company %s: %s->%s"%(id, field, value))
		cur.execute("UPDATE company SET %s=? WHERE id=?"%field,(value, id))
		self.db.commit()
			
	def rpc_product_edit(self, id, field, value):
		cur = self.db.cursor()
		print("UPDATE product %s: %s->%s"%(id, field, value))
		cur.execute("UPDATE product SET %s=? WHERE id=?"%field, (value, id))
		self.db.commit()
		
	def rpc_product_image(self, id, image, thumb):
		cur = self.db.cursor()
		cur.execute("UPDATE product SET image=?, thumb=? WHERE id=?", (image,thumb, id))
		self.db.commit()
	
	def rpc_product_new(self, name):
		cur = self.db.cursor()
		try:
			print("New product %s"%name)
			cur.execute('INSERT INTO product (name, yomi, parent) VALUES (?, "", "0")', (name, ))
		except:
			return {'name':""}
		self.db.commit()
		cur.execute("SELECT id, parent, name, yomi, thumb FROM product WHERE id=?", (cur.lastrowid,))
		return dict(cur.fetchone())
	
	def rpc_product_fetch_companies(self, id):
		cur = self.db.cursor()
		cur.execute("SELECT companyid FROM stock WHERE productid=?", (id, ))
		return [r[0] for r in cur.fetchall()]
		
	def rpc_product_fetchall(self):
		cur = self.db.cursor()
		cur.execute("SELECT id, parent, name, yomi, thumb FROM product ORDER BY parent ASC")
		all = [dict(row) for row in cur.fetchall()]
		for r in all:
			print(r['name'], r['id'], r['parent'], "nuuul" if not r['thumb'] else r['thumb'][0:10])
		return all
		
	def rpc_product_fetchone(self, id):
		cur = self.db.cursor()
		cur.execute("SELECT id, parent, name, yomi, image, thumb FROM product WHERE id=?", (id,))
		return dict(cur.fetchone())
	
	def rpc_product_image_fetch(self, id):
		cur = self.db.cursor()
		cur.execute("SELECT image FROM product WHERE id=?", (id,))
		return cur.fetchone()[0]
